CREATE TABLE [dbo].[EmployeeBenefits]
(
[EmployeeBenefitID] [int] NOT NULL IDENTITY(1, 1),
[EmployeeId] [int] NOT NULL,
[BenefitTypeID] [int] NOT NULL,
[StartDate] [date] NULL
) ON [PRIMARY]
GO
ALTER TABLE [dbo].[EmployeeBenefits] ADD CONSTRAINT [CK_EmployeeBenefits_StartDate] CHECK (([StartDate]<=getdate()))
GO
ALTER TABLE [dbo].[EmployeeBenefits] ADD CONSTRAINT [PK_EmployeeBenefits] PRIMARY KEY CLUSTERED ([EmployeeBenefitID]) ON [PRIMARY]
GO
CREATE NONCLUSTERED INDEX [IX_EmployeeBenefits_BenefitType_Employees] ON [dbo].[EmployeeBenefits] ([BenefitTypeID], [EmployeeId]) ON [PRIMARY]
GO
CREATE NONCLUSTERED INDEX [IX_EmployeeBenefits_Employees_BenefitType] ON [dbo].[EmployeeBenefits] ([EmployeeId], [BenefitTypeID]) ON [PRIMARY]
GO
ALTER TABLE [dbo].[EmployeeBenefits] ADD CONSTRAINT [FK_EmployeeBenefits_BenefitType] FOREIGN KEY ([BenefitTypeID]) REFERENCES [dbo].[BenefitType] ([BenefitTypeID])
GO
ALTER TABLE [dbo].[EmployeeBenefits] ADD CONSTRAINT [FK_EmployeeBenefits_Employees] FOREIGN KEY ([EmployeeId]) REFERENCES [dbo].[Employees] ([EmployeeID])
GO
