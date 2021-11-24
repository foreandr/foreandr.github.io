CREATE TABLE [dbo].[Projects]
(
[ProjectsID] [int] NOT NULL IDENTITY(1, 1),
[EmployeeId] [int] NOT NULL,
[ProjectLeader] [int] NOT NULL,
[ProjectName] [nvarchar] (50) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
[StartDate] [date] NOT NULL CONSTRAINT [DF__Projects__StartD__534D60F1] DEFAULT (getdate()),
[CompletionDate] [date] NULL,
[EstimatedCost] [int] NOT NULL,
[ActualCost] [int] NOT NULL,
[ProjectRatingsId] [int] NOT NULL
) ON [PRIMARY]
GO
ALTER TABLE [dbo].[Projects] ADD CONSTRAINT [PK_Projects] PRIMARY KEY CLUSTERED ([ProjectsID]) ON [PRIMARY]
GO
ALTER TABLE [dbo].[Projects] ADD CONSTRAINT [UQ__Projects__8B315A879822E847] UNIQUE NONCLUSTERED ([ProjectLeader]) ON [PRIMARY]
GO
ALTER TABLE [dbo].[Projects] ADD CONSTRAINT [UQ__Projects__BCBE781C0151082C] UNIQUE NONCLUSTERED ([ProjectName]) ON [PRIMARY]
GO
ALTER TABLE [dbo].[Projects] ADD CONSTRAINT [FK_Employees_ProjectlEAD] FOREIGN KEY ([ProjectLeader]) REFERENCES [dbo].[Employees] ([EmployeeID])
GO
ALTER TABLE [dbo].[Projects] ADD CONSTRAINT [FK_Employees_Projects] FOREIGN KEY ([EmployeeId]) REFERENCES [dbo].[Employees] ([EmployeeID])
GO
ALTER TABLE [dbo].[Projects] ADD CONSTRAINT [FK_Projects_ProjectRatingsId] FOREIGN KEY ([ProjectRatingsId]) REFERENCES [dbo].[ProjectRatings] ([ProjectRatingsId])
GO
