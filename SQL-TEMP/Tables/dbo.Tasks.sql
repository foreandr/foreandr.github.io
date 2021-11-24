CREATE TABLE [dbo].[Tasks]
(
[TasksID] [int] NOT NULL IDENTITY(1, 1),
[TaskName] [nvarchar] (50) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
[CompanyName] [nvarchar] (50) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
[EmployeeId] [int] NOT NULL,
[ProjectsId] [int] NOT NULL,
[StartDate] [date] NOT NULL CONSTRAINT [DF__Tasks__StartDate__5CD6CB2B] DEFAULT (getdate()),
[CompletionDate] [date] NULL,
[ChargeoutRate] [int] NULL,
[RatingId] [int] NOT NULL,
[HoursGuessed] [int] NULL,
[HoursWorked] [int] NULL
) ON [PRIMARY]
GO
ALTER TABLE [dbo].[Tasks] ADD CONSTRAINT [CK_ChargeoutRate] CHECK (([ChargeoutRate]>=(80)))
GO
ALTER TABLE [dbo].[Tasks] ADD CONSTRAINT [PK_Tasks] PRIMARY KEY CLUSTERED ([TasksID]) ON [PRIMARY]
GO
ALTER TABLE [dbo].[Tasks] ADD CONSTRAINT [UQ__Tasks__1E055889A6A61076] UNIQUE NONCLUSTERED ([TaskName]) ON [PRIMARY]
GO
ALTER TABLE [dbo].[Tasks] ADD CONSTRAINT [FK_Tasks_EmployeeRatings] FOREIGN KEY ([RatingId]) REFERENCES [dbo].[EmployeeRatings] ([EmployeeRatingsID])
GO
ALTER TABLE [dbo].[Tasks] ADD CONSTRAINT [FK_Tasks_Employees] FOREIGN KEY ([EmployeeId]) REFERENCES [dbo].[Employees] ([EmployeeID])
GO
ALTER TABLE [dbo].[Tasks] ADD CONSTRAINT [FK_Tasks_Projects] FOREIGN KEY ([ProjectsId]) REFERENCES [dbo].[Projects] ([ProjectsID])
GO
